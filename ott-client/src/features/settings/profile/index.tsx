import { useAppSelector } from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/auth-slice'
import { ContentSection } from '../components/content-section'
import { AvatarForm } from './avatar-form'
import { EmailStatus } from './email-status'
import { PasswordForm } from './password-form'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  const user = useAppSelector(selectCurrentUser)
  if (!user) return null

  return (
    <ContentSection
      title='Profile'
      desc='Your name and photo appear across the app.'
    >
      <div className='grid gap-10'>
        <AvatarForm user={user} />
        <ProfileForm user={user} />
        <EmailStatus user={user} />
        <PasswordForm user={user} />
      </div>
    </ContentSection>
  )
}
