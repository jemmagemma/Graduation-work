import { NextResponse } from 'next/server'
import { loadAll } from '@/lib/data'

export async function GET() {
  try {
    const data = loadAll()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
