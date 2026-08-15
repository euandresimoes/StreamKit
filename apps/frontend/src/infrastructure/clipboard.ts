export async function copyText(text: string): Promise<void> {
  if (window.streamkit?.copyText) {
    await window.streamkit.copyText(text);
    return;
  }
  if (!navigator.clipboard?.writeText) {
    throw new Error("The clipboard is not available.");
  }
  await navigator.clipboard.writeText(text);
}
