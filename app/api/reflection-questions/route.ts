import { getReflectionQuestions } from '@/shared/lib/reflection-questions/reflection-question-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const questions = await getReflectionQuestions();
  return NextResponse.json({ questions });
}
