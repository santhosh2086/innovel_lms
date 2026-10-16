// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

beforeEach(()=>{global.fetch=vi.fn();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('student signup and backend sign-in',()=>{
  it('offers student email OTP signup and sends the signup request to the API',async()=>{
    global.fetch.mockResolvedValueOnce({ok:true,json:async()=>({ok:true,message:'Verification code sent to your email.'})});
    render(<App/>);
    fireEvent.click(screen.getByRole('button',{name:/^Student/}));
    fireEvent.click(screen.getByRole('button',{name:/New student\? Sign up with email OTP/i}));
    fireEvent.change(screen.getByPlaceholderText('Your full name'),{target:{value:'Test Student'}});
    fireEvent.change(screen.getByPlaceholderText('you@example.com'),{target:{value:'student@example.com'}});
    fireEvent.click(screen.getByRole('button',{name:/Send verification code/i}));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/signup/request-otp'),expect.objectContaining({method:'POST'})));
    expect(await screen.findByText(/Verification code sent to your email/i)).toBeTruthy();
  });
  it('uses email and password against the backend for sign-in',async()=>{
    global.fetch.mockResolvedValueOnce({ok:false,json:async()=>({error:{message:'Email, password or workspace is incorrect.'}})});
    render(<App/>);
    fireEvent.click(screen.getByRole('button',{name:/^Student/}));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'),{target:{value:'student@example.com'}});
    fireEvent.change(screen.getByPlaceholderText('Enter your password'),{target:{value:'correct-password-123'}});
    fireEvent.click(screen.getByRole('button',{name:/Sign in to student/i}));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'),expect.objectContaining({method:'POST'})));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i);
  });
});
