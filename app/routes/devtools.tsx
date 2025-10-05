// Route untuk menangani Chrome DevTools well-known request
export default function DevTools() {
  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
}