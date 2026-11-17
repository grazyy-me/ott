import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='Appearance'
      desc='Choose the theme and font. Saved in this browser.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
