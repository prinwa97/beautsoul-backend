// /lib/api-error.ts

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/errors";

type JsonErrorBody = {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
};

function isPrismaKnownRequestError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}

function isPrismaValidationError(err: unknown): err is Prisma.PrismaClientValidationError {
  return err instanceof Prisma.PrismaClientValidationError;
}

function isPrismaUnknownRequestError(err: unknown): err is Prisma.PrismaClientUnknownRequestError {
  return err instanceof Prisma.PrismaClientUnknownRequestError;
}

function isPrismaRustPanicError(err: unknown): err is Prisma.PrismaClientRustPanicError {
  return err instanceof Prisma.PrismaClientRustPanicError;
}

function isPrismaInitializationError(err: unknown): err is Prisma.PrismaClientInitializationError {
  return err instanceof Prisma.PrismaClientInitializationError;
}

function isZodLikeError(err: unknown): err is { issues: unknown[] } {
  return (
    !!err &&
    typeof err === "object" &&
    "issues" in err &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

function makeErrorBody(
  message: string,
  code?: string,
  details?: unknown,
  includeDetails = false
): JsonErrorBody {
  return {
    ok: false,
    error: message,
    ...(code ? { code } : {}),
    ...(includeDetails && details !== undefined ? { details } : {}),
  };
}

export function handleApiError(err: unknown) {
  const isProd = process.env.NODE_ENV === "production";
  const includeDetails = !isProd;

  if (err instanceof HttpError) {
    return NextResponse.json(
      makeErrorBody(err.message, err.code, err.details, includeDetails),
      { status: err.status }
    );
  }

  if (isZodLikeError(err)) {
    return NextResponse.json(
      makeErrorBody("Validation failed", "VALIDATION_ERROR", err.issues, includeDetails),
      { status: 422 }
    );
  }

  if (isPrismaKnownRequestError(err)) {
    switch (err.code) {
      case "P2002":
        return NextResponse.json(
          makeErrorBody("Record already exists", "UNIQUE_CONSTRAINT", err.meta, includeDetails),
          { status: 409 }
        );

      case "P2003":
        return NextResponse.json(
          makeErrorBody("Related record not found", "FOREIGN_KEY_CONSTRAINT", err.meta, includeDetails),
          { status: 409 }
        );

      case "P2025":
        return NextResponse.json(
          makeErrorBody("Record not found", "RECORD_NOT_FOUND", err.meta, includeDetails),
          { status: 404 }
        );

      case "P2021":
        return NextResponse.json(
          makeErrorBody("Database table does not exist", "TABLE_NOT_FOUND", err.meta, includeDetails),
          { status: 500 }
        );

      case "P2022":
        return NextResponse.json(
          makeErrorBody("Database column does not exist", "COLUMN_NOT_FOUND", err.meta, includeDetails),
          { status: 500 }
        );

      default:
        return NextResponse.json(
          makeErrorBody("Database request failed", err.code, err.meta, includeDetails),
          { status: 500 }
        );
    }
  }

  if (isPrismaValidationError(err)) {
    return NextResponse.json(
      makeErrorBody("Invalid database input", "PRISMA_VALIDATION_ERROR", String(err), includeDetails),
      { status: 400 }
    );
  }

  if (isPrismaUnknownRequestError(err)) {
    return NextResponse.json(
      makeErrorBody("Unknown database error", "PRISMA_UNKNOWN_ERROR", String(err), includeDetails),
      { status: 500 }
    );
  }

  if (isPrismaRustPanicError(err)) {
    return NextResponse.json(
      makeErrorBody("Database engine crashed", "PRISMA_RUST_PANIC", String(err), includeDetails),
      { status: 500 }
    );
  }

  if (isPrismaInitializationError(err)) {
    return NextResponse.json(
      makeErrorBody("Database connection failed", "PRISMA_INIT_ERROR", String(err), includeDetails),
      { status: 500 }
    );
  }

  const fallbackMessage =
    err instanceof Error && !isProd ? err.message : "Internal error";

  return NextResponse.json(
    makeErrorBody(fallbackMessage, "INTERNAL_ERROR", err, includeDetails),
    { status: 500 }
  );
}