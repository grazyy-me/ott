// English display names for ISO codes, shared by the FilterBar and the title details
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

const safeName = (names: Intl.DisplayNames, code: string) => {
  try {
    return names.of(code) ?? code
  } catch {
    return code
  }
}

/** "IN" -> "India" (falls back to the code) */
export const countryName = (code: string) => safeName(regionNames, code)
/** "ko" -> "Korean" (falls back to the code) */
export const languageName = (code: string) => safeName(languageNames, code)
