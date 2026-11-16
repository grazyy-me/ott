import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { User } from '@/types/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useUpdateMeMutation } from '@/features/user/user-api'

const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm({ user }: { user: User }) {
  const [updateMe, { isLoading }] = useUpdateMeMutation()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: { name: user.name },
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      await updateMe(data).unwrap()
      toast.success('Profile saved')
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-6'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete='name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input value={user.email} disabled readOnly />
          <FormDescription>
            Your email is your sign-in name and can't be changed here.
          </FormDescription>
        </FormItem>
        <Button
          type='submit'
          className='w-fit'
          disabled={isLoading || !form.formState.isDirty}
        >
          {isLoading && <Loader2 className='animate-spin' />}
          Save profile
        </Button>
      </form>
    </Form>
  )
}
