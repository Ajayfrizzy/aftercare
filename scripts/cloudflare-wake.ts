type WakeSettings = {
  SPRITE_ORIGIN: string;
  WAKE_TOKEN: string;
  WINDOW_START: string;
  WINDOW_END: string;
};

export async function signalWake(
  scheduledTime: number,
  env: WakeSettings,
  transport = fetch,
  now = Date.now(),
) {
  console.info("wake.window_check");
  const start = Date.parse(env.WINDOW_START);
  const end = Date.parse(env.WINDOW_END);
  if(Number.isFinite(end) && (now>=end || scheduledTime>=end)){ console.info("wake.expired");return; }
  if (!Number.isFinite(scheduledTime) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end-start > 30*60_000) throw Error("Invalid experiment window");
  if (scheduledTime < start || scheduledTime >= end || now < start || now >= end) return;
  if (!/^https:\/\/[a-z0-9-]+\.sprites\.app$/.test(env.SPRITE_ORIGIN) || !/^[a-f0-9]{64}$/.test(env.WAKE_TOKEN)) throw Error("Invalid wake configuration");
  console.info("wake.fetch_start");
  const response = await transport(env.SPRITE_ORIGIN+"/wake", {
    method:"POST", headers:{Authorization:"Bearer "+env.WAKE_TOKEN},
    redirect:"error", signal:AbortSignal.timeout(25000),
  }).catch(()=>{throw Error("wake.transport_or_tls_failed")});
  if(response.redirected) throw Error("wake.redirect_rejected");
  if(response.status===401 || response.status===403) throw Error("wake.authentication_rejected");
  if(response.status!==204) throw Error("wake.remote_status_"+response.status);
  console.info("wake.accepted");
}

export default {
  scheduled(event:{scheduledTime:number}, env:WakeSettings) {
    return signalWake(event.scheduledTime, env);
  },
};
