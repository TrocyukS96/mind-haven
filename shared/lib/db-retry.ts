const TRANSIENT_DB_ERROR =
  /closed|connection.*(terminated|reset|refused|lost)|can't reach database server|p1001|p1017|engine is not yet connected|response from the engine was empty/i;

export function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return TRANSIENT_DB_ERROR.test(error.message);
}
