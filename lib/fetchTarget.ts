export type FetchTargetResult = {
  meta: {
    requestedUrl: string;
    status: number;
    timeMs: number;
    contentType: string | null;
  };
  data: unknown;
};

export async function fetchTarget(): Promise<FetchTargetResult> {
  throw new Error("Shared fetch target implementation pending.");
}
