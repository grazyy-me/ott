import { Logo } from '@/assets/logo'
import { APP_NAME } from '@/lib/config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8'>
        <div className='mb-4 flex flex-col items-center justify-center gap-3'>
          <Logo className='h-16' />
          <h1 className='text-2xl font-semibold tracking-tight'>{APP_NAME}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
