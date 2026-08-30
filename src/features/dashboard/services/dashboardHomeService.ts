import { supabase } from "@/lib/supabase";
import type { DashboardHomeData, DashboardPeriodId } from "../types";
import { periodRange } from "../utils";

const DEFAULT_TIMEOUT = 20000;

const withTimeout = <T>(promise: PromiseLike<T>, timeoutMs: number = DEFAULT_TIMEOUT): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("A consulta do painel expirou. Verifique a conexão e tente de novo.")), timeoutMs),
    ),
  ]);
};

export class DashboardHomeService {
  static async getHome(period: DashboardPeriodId): Promise<DashboardHomeData> {
    const { from, to } = periodRange(period);
    const { data, error } = await withTimeout(
      supabase.rpc("report_dashboard_home", { p_from: from, p_to: to }),
    );
    if (error) {
      throw new Error(`Não foi possível carregar o painel: ${error.message}`);
    }
    return data as DashboardHomeData;
  }
}
