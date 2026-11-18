/**
 * 5-receive-upstream（契约 5-receive-upstream/README.md + index.md）：
 * 回程第一站——接住供应商的响应。这一站薄得像纸：官方纪律要求响应
 * "原样过境"，能不做的事一律不做。本层只做防御性校验（理论上必有
 * 响应），然后原样移交 6-route-back：不读状态码语义（错误也照样透传，
 * 客户端要读错误原文做自动恢复）、不碰流、不解析 SSE。
 */

import { IncomingMessage, type IncomingHttpHeaders, type ServerResponse } from "node:http";
import type { Readable } from "node:stream";

import { GatewayError } from "../errors/index.ts";
import { routeBack } from "../6-route-back/index.ts";

/**
 * 上游响应句柄：4-send 转交。与 node http 响应同形——statusCode/headers
 * 之外，数据流要么是 IncomingMessage 自身，要么是显式的 stream 指针，
 * 两种都认（本层只交接，不消费流）。
 */
export type UpstreamResponse =
  | IncomingMessage
  | {
      readonly statusCode: number | undefined;
      readonly headers: IncomingHttpHeaders;
      readonly stream: Readable;
    };

/**
 * 接住上游响应，原样移交 6-route-back。
 * @param upstream 4-send 转交的响应句柄；缺失/不完整 → 502 api_error
 *   （防御：理论上 4-send 只在收到响应后才会调用本层）。
 * @param clientRes Desktop 侧的响应出口，原样下传。
 */
export function receiveUpstream(
  upstream: UpstreamResponse | null | undefined,
  clientRes: ServerResponse,
): void {
  if (upstream == null) {
    throw new GatewayError(502, "api_error", "上游响应缺失，请稍后重试");
  }
  const statusCode = upstream.statusCode;
  const stream = upstream instanceof IncomingMessage ? upstream : upstream.stream;
  if (typeof statusCode !== "number" || stream == null) {
    throw new GatewayError(502, "api_error", "上游响应不完整，请稍后重试");
  }
  routeBack({ statusCode, headers: upstream.headers, stream }, clientRes);
}
