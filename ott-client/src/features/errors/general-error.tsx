import { useNavigate } from 'react-router'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  useDocumentTitle('Something went wrong')
  const navigate = useNavigate()
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>Oops! Something went wrong {`:')`}</span>
        <p className='text-center text-muted-foreground'>
          We apologize for the inconvenience. <br /> Please try again later.
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button
              variant='outline'
              className='pointer-coarse:h-11'
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              className='pointer-coarse:h-11'
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
