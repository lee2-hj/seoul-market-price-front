import apiMiddleware from "@/api/middleware";

export interface SggResponse {
  sggCd: string;
  sggNm: string;
}

export interface DongResponse {
  dongCd: string;
  dongNm: string;
}

export async function getSggs(): Promise<SggResponse[]> {
  const { data } = await apiMiddleware.get<SggResponse[]>("/api/location/sggs");
  return data;
}

export async function getDongs(sggCd: string): Promise<DongResponse[]> {
  const { data } = await apiMiddleware.get<DongResponse[]>("/api/location/dongs", {
    params: { sggCd },
  });
  return data;
}
