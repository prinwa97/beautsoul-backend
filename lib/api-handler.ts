import { NextResponse } from "next/server";

type RouteHandler<TContext = unknown> = (
  req: Request,
  ctx: TContext
) => Promise<Response> | Response;

export function apiHandler<TContext = unknown>(handler: RouteHandler<TContext>) {
  return async function wrapped(req: Request, ctx: TContext) {
    try {
      return await handler(req, ctx);
    } catch (error: any) {
      console.error("[API_ERROR]", error);

      const status =
        typeof error?.status === "number"
          ? error.status
          : typeof error?.statusCode === "number"
          ? error.statusCode
          : 500;

      const message =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : "Internal Server Error";

      return NextResponse.json(
        {
          ok: false,
          error: message,
          code: error?.code || "INTERNAL_SERVER_ERROR",
          details: error?.details ?? null,
        },
        { status }
      );
    }
  };
}