/**
 * generate（契约 core/archive/generate/README.md + index.md）：
 * sidecar → Desktop profile 生成器（file-formats.md §4.1/§4.2 的代码化）。
 *
 * 翻译官：把 Harbor 的完整底账翻译成 Desktop 认识的 profile JSON。
 * 只产内容，不负责写文件（写盘是 activate 流程经 ../fs 的事），纯函数、
 * 无文件 IO。合并顺序（后者覆盖前者）：
 * ① claude 透传块原样展开 → ② CLI 管理键覆盖/补充 →
 * ③ inferenceModels 由条目删掉自有扩展键得到（键名/顺序已镜像 Desktop）。
 *
 * 管理键（§4.1/§4.2）：
 * - inferenceProvider: "gateway"、inferenceCredentialKind: "static"（两种
 *   配置都写；§4.2"同 §4.1"）；
 * - 高级：baseUrl = http://127.0.0.1:<port>、apiKey = sidecar.gatewayToken、
 *   scheme 为 x-api-key 才写 inferenceGatewayAuthScheme（bearer 省略，
 *   Desktop 惯例）；
 * - 标准：三个 inferenceGateway* 同键名复制自供应商文件（key 明文写出，
 *   Desktop 自动密封）。
 *
 * 纪律：不读文件、不写文件、不碰 Claude 目录；readOnly 拒绝（外来镜像
 * 无生成意义，单向只删）。
 */

import type { AdvancedModelEntry, HarborProfile, Provider, StandardModelEntry } from "../../types.ts";

/**
 * 结构化错误（契约"失败：结构化错误"）：code 供程序判断，message 是面向
 * 用户的中文描述。
 * - CONFLICT：readOnly profile 无生成意义
 * - VALIDATION：结构不完整（standard 缺供应商三件套、advanced 缺网关字段）
 */
export type GenerateErrorCode = "CONFLICT" | "VALIDATION";

export class GenerateError extends Error {
  readonly code: GenerateErrorCode;

  constructor(code: GenerateErrorCode, message: string) {
    super(message);
    this.name = "GenerateError";
    this.code = code;
  }
}

/** 高级配置条目 → Desktop 条目：删掉 provider + upstreamModel。 */
function advancedEntryOf(entry: AdvancedModelEntry): Record<string, unknown> {
  const { provider: _provider, upstreamModel: _upstreamModel, ...rest } = entry;
  return { ...rest };
}

/** 标准配置条目 → Desktop 条目：删掉 provider。 */
function standardEntryOf(entry: StandardModelEntry): Record<string, unknown> {
  const { provider: _provider, ...rest } = entry;
  return { ...rest };
}

/**
 * 由 sidecar 底账生成 Desktop profile JSON（§4.1 高级 / §4.2 标准）。
 * standard 必须附供应商三件套（provider 参数）；advanced 用 sidecar 的
 * port/gatewayToken/gatewayAuthScheme。readOnly 抛 CONFLICT。
 */
export function generateDesktopProfile(
  profile: HarborProfile,
  provider?: Provider,
): Record<string, unknown> {
  if (profile.mode === "readOnly") {
    throw new GenerateError(
      "CONFLICT",
      "只读镜像（readOnly）是 Claude 外来 profile 的单向镜像，没有可生成的期望配置",
    );
  }

  const out: Record<string, unknown> = { ...(profile.claude ?? {}) };
  out.inferenceProvider = "gateway";
  out.inferenceCredentialKind = "static";

  if (profile.mode === "advanced") {
    if (
      typeof profile.port !== "number" ||
      typeof profile.gatewayToken !== "string" ||
      profile.gatewayToken.length === 0 ||
      (profile.gatewayAuthScheme !== "x-api-key" && profile.gatewayAuthScheme !== "bearer")
    ) {
      throw new GenerateError(
        "VALIDATION",
        "高级配置（advanced）sidecar 缺少网关字段（port / gatewayToken / gatewayAuthScheme），档案结构不完整",
      );
    }
    out.inferenceGatewayBaseUrl = `http://127.0.0.1:${profile.port}`;
    out.inferenceGatewayApiKey = profile.gatewayToken;
    if (profile.gatewayAuthScheme === "x-api-key") {
      out.inferenceGatewayAuthScheme = "x-api-key";
    }
    out.inferenceModels = profile.inferenceModels.map(advancedEntryOf);
    return out;
  }

  // standard：三个 inferenceGateway* 同键名复制自供应商文件。
  if (!provider) {
    throw new GenerateError(
      "VALIDATION",
      "标准配置（standard）生成需要供应商三件套，请附上对应的 Provider",
    );
  }
  const { inferenceGatewayBaseUrl, inferenceGatewayApiKey, inferenceGatewayAuthScheme } = provider;
  if (
    typeof inferenceGatewayBaseUrl !== "string" ||
    inferenceGatewayBaseUrl.length === 0 ||
    typeof inferenceGatewayApiKey !== "string" ||
    inferenceGatewayApiKey.length === 0
  ) {
    throw new GenerateError(
      "VALIDATION",
      "标准配置（standard）引用的供应商档案缺少 inferenceGatewayBaseUrl / inferenceGatewayApiKey，无法生成",
    );
  }
  out.inferenceGatewayBaseUrl = inferenceGatewayBaseUrl;
  out.inferenceGatewayApiKey = inferenceGatewayApiKey;
  if (inferenceGatewayAuthScheme === "x-api-key") {
    out.inferenceGatewayAuthScheme = "x-api-key";
  }
  out.inferenceModels = profile.inferenceModels.map(standardEntryOf);
  return out;
}
