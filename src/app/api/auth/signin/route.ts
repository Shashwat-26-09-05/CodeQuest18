import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendThankYouEmail, sendAdminSignInNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Debug logging
    console.log('=== SIGNIN DEBUG ===')
    console.log('Email value:', email)
    console.log('Email type:', typeof email)
    console.log('Is email a string?', typeof email === 'string')
    console.log('Full body:', body)
    console.log('===================')

    // Validate email is provided and is a string
    if (!email || typeof email !== 'string') {
      console.error('Email validation failed. Expected string, got:', typeof email)
      return NextResponse.json(
        { error: 'Email is required and must be a valid email address' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update last activity
    await db.user.update({
      where: { id: user.id },
      data: { lastActivity: new Date() }
    })

    // Send thank you email to user
    const thankYouResult = await sendThankYouEmail(
      user.email,
      user.name || user.email.split('@')[0],
      user.id
    )

    // Send admin notification about sign-in
    await sendAdminSignInNotification(
      user.name || user.email.split('@')[0],
      user.email,
      user.id
    )

    // Return user data (user doesn't have password field)
    const userWithoutPassword = user

    return NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutPassword,
        thankYouEmailSent: thankYouResult.success,
        adminNotificationSent: thankYouResult.success
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
