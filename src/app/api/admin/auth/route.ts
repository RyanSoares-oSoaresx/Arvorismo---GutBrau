import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST: Realiza login do admin
export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'gutbrauadmin123';

    if (password === adminPassword) {
      const response = NextResponse.json({ success: true });
      
      // Define cookie seguro de sessão (HTTP-only)
      response.cookies.set('gutbrau_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: '/',
      });
      
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Senha administrativa incorreta.' }, 
      { status: 401 }
    );
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor.' }, 
      { status: 500 }
    );
  }
}

// GET: Verifica se o admin está autenticado
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('gutbrau_session');
  
  if (session && session.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }
  
  return NextResponse.json({ authenticated: false });
}

// DELETE: Realiza logout do admin (limpa o cookie)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('gutbrau_session', '', { 
    maxAge: 0, 
    path: '/' 
  });
  return response;
}
