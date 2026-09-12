import { useState, useEffect } from 'react';
import {
  Heart,
  Mail,
  Lock,
  User,
  ArrowRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from '../router';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, Spinner } from '../components/ui';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('home');
  }, [user, navigate]);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'signup' && form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setSubmitting(false);
      return;
    }

    const result =
      mode === 'signin'
        ? await signIn(form.email, form.password)
        : await signUp(form.email, form.password, form.fullName);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate('home');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <button onClick={() => navigate('home')} className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
              <Heart className="h-6 w-6 text-white" fill="white" />
            </div>
            <span className="font-serif text-xl font-bold text-neutral-900
