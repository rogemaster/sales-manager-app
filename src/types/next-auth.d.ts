import { UserGrade } from '@/features/auth/types/Auth';

declare module 'next-auth' {
  interface User {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }

  interface Session {
    user: {
      id: string;
      ownerId: string;
      email: string;
      name: string;
      grade: UserGrade;
      avatar: string;
      phone: string;
      bio: string;
      company: string;
      location: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    ownerId: string;
    grade: UserGrade;
    avatar: string;
    phone: string;
    bio: string;
    company: string;
    location: string;
  }
}
