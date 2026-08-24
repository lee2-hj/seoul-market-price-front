export function formatBoardDate(dateString?: string): string {
  if (!dateString) return "-";
  if (dateString.includes("T")) {
    const [date, time] = dateString.split("T");
    return `${date.replace(/-/g, ".")} ${time ? time.slice(0, 5) : ""}`.trim();
  }
  return dateString.replace(/-/g, ".");
}
