import Image from 'next/image';

export const LoginSideBanner = () => {
  return (
    <div className="relative hidden bg-muted md:block">
      <Image
        src="/logo.svg"
        alt="Image"
        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        width={32}
        height={32}
      />
    </div>
  );
};
