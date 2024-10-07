/**
 * An enum containing the possible task statuses.
 * Corresponds to values in the JSON files from the backend.
 */
export enum TaskStatus {
  queued = "queued",
  successful = "successful",
  failed = "failed",
}

/**
 * Information about a prediction, as returned by the API.
 */
export interface PredictionInfo {
  id: string;
  database: string;
  created: string;
  lastChange: string;
  status: string;
  metadata: {
    structureName: string;
    predictionName: string;
    predictedStructure?: boolean;
  };
}

/**
 * A wrapper around the response from the API containing the status code and the content.
 */
export interface HttpWrap<T> {
  statusCode: number;
  content: T | null;
}

/**
 * A method to fetch the prediction info from the API.
 * @param database The database to fetch the prediction from.
 * @param id The ID of the prediction.
 * @returns A promise that resolves to the prediction info.
 */
export async function fetchPrediction(
  database: string, id: string
): Promise<HttpWrap<PredictionInfo>> {
  // We need to navigate to the root, and then we can request the data.
  const url = getApiEndpoint(database, id);
  const response = await fetch(url);
  let result;
  try {
    result = await response.json();
  } catch {
    return {
      "statusCode": response.status,
      "content": null,
    };
  }
  return {
    "statusCode": response.status,
    "content": result as PredictionInfo,
  };
}

/**
 * A method to get the API endpoint for a prediction.
 * @param database The database to fetch the prediction from.
 * @param id The ID of the prediction.
 * @returns An URL to the API endpoint for the prediction.
 */
export function getApiEndpoint(database: string, id: string, taskType: string = "prediction") {
  return `./api/v2/${taskType}/${database}/${id.toUpperCase()}`;
}

/**
 * A method to fetch the prediction log from the API.
 * @param database The database to fetch the prediction from.
 * @param id The ID of the prediction.
 * @returns A promise that resolves to the prediction log.
 */
export async function fetchPredictionLog(
  database: string, id: string
): Promise<string> {
  const url = getApiEndpoint(database, id) + "/log";
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error("Invalid response.");
  }
  return response.text();
}

/**
 * A method to fetch the whole prediction ZIP file from the API.
 * @param database The database to fetch the prediction from.
 * @param id The ID of the prediction.
 * @returns An URL to the ZIP file.
 */
export function getApiDownloadUrl({ database, id }: PredictionInfo) {
  const baseUrl = getApiEndpoint(database, id);
  return `${baseUrl}/public/prankweb.zip`;
}
