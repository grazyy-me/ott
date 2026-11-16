import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { passwordSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { useResetPasswordMutation } from '@/features/auth/auth-api'
import { AuthLayout } from '../auth-layout'

const formSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [resetPassword, { isLoading }] = useResetPasswordMutation()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit({ password }: z.infer<typeof formSchema>) {
    if (!token) return
    try {
      await resetPassword({ token, password }).unwrap()
      toast.success('Password updated. Sign in with your new password.')
      navigate('/sign-in', { replace: true })
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  }

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4 sm:min-w-sm'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Choose a new password
          </CardTitle>
          <CardDescription>
            This signs you out on every other device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className='text-sm'>
              This reset link is incomplete.{' '}
              <Link
                to='/forgot-password'
                className='underline underline-offset-4 hover:text-primary'
              >
                Request a new link
              </Link>
              .
            </p>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='grid gap-3'
              >
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete='new-password' {...field} />
                      </FormControl>
                      <FormDescription>
                        At least 8 characters, with a letter and a number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete='new-password' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root && (
                  <p role='alert' className='text-sm text-destructive'>
                    {form.formState.errors.root.message}{' '}
                    <Link
                      to='/forgot-password'
                      className='underline underline-offset-4'
                    >
                      Request a new link
                    </Link>
                  </p>
                )}
                <Button className='mt-2' disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className='animate-spin' />
                  ) : (
                    <KeyRound />
                  )}
                  Update password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
