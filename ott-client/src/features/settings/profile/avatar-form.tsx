import { useRef } from 'react'
import type { User } from '@/types/api'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useUpdateAvatarMutation } from '@/features/user/user-api'

const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function AvatarForm({ user }: { user: User }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [updateAvatar, { isLoading }] = useUpdateAvatarMutation()

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be picked again
    if (!file) return
    if (!TYPES.includes(file.type)) {
      toast.error('Choose a JPG, PNG, WEBP or GIF image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Choose an image under 2 MB.')
      return
    }
    try {
      await updateAvatar(file).unwrap()
      toast.success('Photo updated')
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <section className='flex items-center gap-4'>
      <UserAvatar user={user} className='size-16' fallbackClassName='text-lg' />
      <div className='grid gap-1.5'>
        <input
          ref={inputRef}
          type='file'
          accept={TYPES.join(',')}
          className='sr-only'
          id='avatar-input'
          onChange={onFileChange}
        />
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          className='w-fit'
        >
          {isLoading ? <Loader2 className='animate-spin' /> : <Upload />}
          {user.avatar?.url ? 'Change photo' : 'Upload photo'}
        </Button>
        <p className='text-xs text-muted-foreground'>
          JPG, PNG, WEBP or GIF, up to 2 MB.
        </p>
      </div>
    </section>
  )
}
