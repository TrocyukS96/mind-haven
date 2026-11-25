import type { GoalInput } from '@/shared/lib/finance/capital-ledger';
import { createFinanceGoal, getFinanceBooks } from '@/shared/lib/finance/finance-service';
import { isUserId, jsonError, requireUserId } from '../../route-helpers';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;

  try {
    const books = await getFinanceBooks(userId);
    return NextResponse.json({ goals: books.goals, books });
  } catch (error) {
    return jsonError(error, 'Failed to load goals');
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!isUserId(userId)) return userId;

  try {
    const body = (await request.json()) as GoalInput;
    const result = await createFinanceGoal(userId, body);
    return NextResponse.json({ goal: result.value, books: result.books }, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create goal');
  }
}
