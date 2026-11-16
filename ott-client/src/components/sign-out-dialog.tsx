import { useNavigate } from 'react-router'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLogoutMutation } from '@/features/auth/auth-api'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const [logout, { isLoading }] = useLogoutMutation()

  const handleSignOut = async () => {
    // logout clears local state even if the request fails
    await logout().catch(() => undefined)
    onOpenChange(false)
    navigate('/sign-in', { replace: true })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='You will need to sign in again to use your account on this device.'
      confirmText='Sign out'
      destructive
      isLoading={isLoading}
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
