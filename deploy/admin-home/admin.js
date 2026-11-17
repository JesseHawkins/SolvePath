// Fills in the admin page. Runs under the site's Content-Security-Policy,
// so it's an external file, not an inline script.
async function check(url, id, isOk) {
  const el = document.getElementById(id);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const ok = res.ok && isOk(await res.text());
    el.textContent = ok ? "OK" : `Problem (HTTP ${res.status})`;
    el.className = ok ? "ok" : "bad";
  } catch (error) {
    el.textContent = `Unreachable (${error.message})`;
    el.className = "bad";
  }
}

check("/healthz", "health-web", (body) => body.trim() === "ok");
check("/api/health", "health-pb", (body) => body.includes("200") || body.includes("healthy"));

fetch("versions.json", { cache: "no-store" })
  .then((res) => res.json())
  .then((data) => {
    document.getElementById("versions").textContent = JSON.stringify(data, null, 2);
  })
  .catch(() => {
    document.getElementById("versions").textContent = "versions.json not found";
  });
