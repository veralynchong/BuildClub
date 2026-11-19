// A caption line made fit to show as a title: no #hashtags, no @mentions or "ib: @account" credits, single spaces.
// Applied at display time, so videos saved earlier show a clean title too; the stored hook is left as read.
// Falls back to the line as given when nothing would be left.
export function videoTitle(line: string): string {
  const clean = line
    .replace(/\b(?:ib|inspo|cr|credit|via)\s*:?\s*@\S+/gi, '')
    .replace(/[#@]\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|·:–-]+|[\s|·:–-]+$/g, '')
  return clean || line.trim()
}
