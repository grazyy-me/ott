import { type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** The brand mark (the bird). Decorative: it always sits next to the app name, so alt is empty. */
export function Logo({
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src='/images/logo.webp'
      alt=''
      width={291}
      height={160}
      decoding='async'
      draggable={false}
      className={cn('h-8 w-auto shrink-0 select-none', className)}
      {...props}
    />
  )
}
