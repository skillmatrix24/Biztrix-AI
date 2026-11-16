
'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Bell, Menu, Search, LogOut, User, MessageSquare, Clock, CheckCircle2, Loader2, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, initiateSignOut, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { collection, query, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BottomNav } from '@/components/layout/bottom-nav';
import { QuickActionFAB } from '@/components/layout/quick-action-fab';
import { DevelopmentBanner } from '@/components/layout/development-banner';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  
  const isFullPageRoute = useMemo(() => {
    if (!pathname) return false;
    const path = pathname.replace(/\/$/, '');
    
    return path === '' || 
           path === '/' || 
           path === '/shop' || 
           path === '/funnel' || 
           path.startsWith('/funnel/') || 
           path.startsWith('/projects/track') || 
           path.startsWith('/feedback/form') || 
           path.startsWith('/feedback/track') ||
           path.startsWith('/loyalty/track') ||
           path.startsWith('/loyalty/join') ||
           path.startsWith('/loyalty/payment-failed') ||
           path.startsWith('/loyalty/payment-cancelled') ||
           path.startsWith('/loyalty/success') ||
           path.startsWith('/portal/solar') ||
           path.startsWith('/complaints/track') ||
           path.startsWith('/complaints/form') ||
           path.startsWith('/staff/track');
  }, [pathname]);
                        
  const isHybridRoute = Boolean(pathname?.startsWith('/marketplace') || pathname === '/pricing');
  const isActuallyLoggedIn = user && !user.isAnonymous;

  const userProfileRef = useMemoFirebase(() => 
    !isUserLoading && user?.uid && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null
  , [firestore, user?.uid, isUserLoading, user?.isAnonymous]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null
  , [firestore, businessId]);
  const { data: business } = useDoc<any>(businessRef);

  const globalBrandingRef = useMemoFirebase(() => 
    isActuallyLoggedIn ? doc(firestore, 'system', 'config', 'branding', 'main') : null
  , [firestore, isActuallyLoggedIn]);
  const { data: globalBranding } = useDoc<any>(globalBrandingRef);

  const activeFavicon = useMemo(() => {
    const isBrandingPro = business?.activeAddonIds?.includes('feat_branding') || business?.status === 'pro';
    return (isBrandingPro && business?.faviconUrl) ? business.faviconUrl : globalBranding?.faviconUrl;
  }, [business, globalBranding]);

  const activeLogo = useMemo(() => {
    const isBrandingPro = business?.activeAddonIds?.includes('feat_branding') || business?.status === 'pro';
    return (isBrandingPro && business?.logoUrl) ? business.logoUrl : globalBranding?.logoUrl;
  }, [business, globalBranding]);

  useEffect(() => {
    if (activeFavicon && mounted) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = activeFavicon;
    }
  }, [activeFavicon, mounted]);

  const bizNotifQuery = useMemoFirebase(() => {
    if (!firestore || !businessId || !user?.uid || user.isAnonymous) return null;
    return query(
      collection(firestore, 'businesses', businessId, 'notifications'),
      where('recipientId', '==', user.uid)
    );
  }, [firestore, businessId, user?.uid, user?.isAnonymous]);

  const { data: notificationsData, isLoading: isNotifLoading } = useCollection<any>(bizNotifQuery);
  
  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return [...notificationsData].sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [notificationsData]);

  const unreadCount = useMemo(() => {
    return notifications ? notifications.filter(n => !n.isRead).length : 0;
  }, [notifications]);

  const markAllAsRead = () => {
    if (!businessId || !notifications || notifications.length === 0) return;
    notifications.forEach(n => {
      if (!n.isRead) {
        const notifRef = doc(firestore, 'businesses', businessId, 'notifications', n.id);
        updateDocumentNonBlocking(notifRef, { isRead: true });
      }
    });
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead && businessId) {
      const notifRef = doc(firestore, 'businesses', businessId, 'notifications', n.id);
      updateDocumentNonBlocking(notifRef, { isRead: true });
    }
    if (n.taskId) router.push(`/notes/${n.taskId}`);
    else if (n.projectId) router.push(`/projects/${n.projectId}`);
    else if (n.ticketId) router.push(`/complaints/${n.ticketId}`);
    else if (n.type === 'task') router.push('/notes');
    else if (n.type === 'payment') router.push('/payment-requests');
  };

  useEffect(() => {
    if (!isUserLoading && mounted) {
      if (!isActuallyLoggedIn && !isFullPageRoute && !isAuthRoute && !isHybridRoute) {
        router.push('/login');
      } else if (isActuallyLoggedIn && isAuthRoute) {
        router.push('/dashboard');
      }
    }
  }, [isActuallyLoggedIn, isUserLoading, isFullPageRoute, isAuthRoute, isHybridRoute, router, mounted]);

  if (!mounted) return null;

  if (!isActuallyLoggedIn && (isFullPageRoute || isAuthRoute || isHybridRoute)) return <>{children}</>;
  if (isFullPageRoute || isAuthRoute) return <>{children}</>;
  
  if (isUserLoading || (isActuallyLoggedIn && isProfileLoading) || (!isActuallyLoggedIn && !isFullPageRoute && !isAuthRoute && !isHybridRoute)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/70">
        <div className="h-11 w-11 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-white mb-3">
          <span className="text-lg font-bold">B</span>
        </div>
        <p className="text-xs font-medium text-slate-500">Loading workspace...</p>
      </div>
    );
  }

  const handleSignOut = () => {
    initiateSignOut(auth).then(() => {
      router.push('/login');
    }).catch(err => {
      console.error("Sign out error:", err);
      router.push('/login');
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50/70">
        <SidebarNav />
        <SidebarInset className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden relative bg-slate-50/70 text-slate-900">
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center border-b border-slate-200 bg-white/95 backdrop-blur px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 md:gap-4 flex-1 text-left min-w-0">
              <SidebarTrigger className="md:hidden"><Menu className="h-5 w-5 text-slate-600" /></SidebarTrigger>
              <div className="flex items-center gap-2.5 md:hidden min-w-0">
                <div className="h-8 w-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {activeLogo ? <img src={activeLogo} referrerPolicy="no-referrer" className="h-full w-full object-contain" alt="Workspace Logo" /> : <span className="text-xs font-bold text-slate-900">B</span>}
                </div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[160px]">{business?.name || "Biztrix AI"}</h1>
              </div>
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                  {business?.name || "Biztrix Workspace"}
                </span>
                <span aria-hidden="true" className="text-slate-300">/</span>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Command Center</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <DropdownMenu onOpenChange={(open: boolean) => open && markAllAsRead()}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    <Bell className="h-4 w-4 md:h-5 md:w-5" />
                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center border-2 border-white tabular-nums">{unreadCount}</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-slate-200 bg-white shadow-none p-0 overflow-hidden">
                  <DropdownMenuLabel className="font-semibold text-xs px-4 py-3 bg-slate-50 text-slate-900 border-b border-slate-100 flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="text-[11px] font-semibold text-primary tabular-nums">{unreadCount} new</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="m-0" />
                  <ScrollArea className="h-[350px]">
                    {isNotifLoading ? <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" /></div> : (!notifications || notifications.length === 0) ? <div className="p-10 text-center space-y-2 text-slate-400"><CheckCircle2 className="h-7 w-7 mx-auto" /><p className="text-xs font-medium text-slate-500">Inbox is clear</p></div> : notifications.map((n) => (
                      <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n)} className={cn("p-4 border-b border-slate-100 last:border-0 cursor-pointer focus:bg-slate-50 text-left items-start", !n.isRead && "bg-primary/5")}>
                        <div className="flex gap-3 w-full text-left items-start">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", n.type === 'message' ? "bg-orange-100 text-orange-600" : n.type === 'task' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-700")}>
                            {n.type === 'message' ? <MessageSquare className="h-4 w-4" /> : n.type === 'task' ? <Clock className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 space-y-1 text-left"><p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p><p className="text-xs text-slate-600 line-clamp-2">{n.message}</p><p className="text-[11px] text-slate-400 tabular-nums">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p></div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" aria-label="Account menu" className="relative h-9 w-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800 hover:text-white flex items-center justify-center font-semibold text-xs shrink-0">{user?.email?.charAt(0).toUpperCase() || 'U'}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-slate-200 bg-white shadow-none p-1.5">
                  <DropdownMenuLabel className="font-semibold text-xs text-slate-500 px-3 py-2">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="px-3 py-2.5 rounded-xl cursor-pointer">
                    <Link href="/profile" className="flex items-center gap-2.5 text-xs font-semibold text-slate-800"><User className="h-4 w-4 text-primary" /> Profile Overview</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="px-3 py-2.5 rounded-xl cursor-pointer text-destructive focus:text-destructive"><div className="flex items-center gap-2.5 text-xs font-semibold"><LogOut className="h-4 w-4" /> Sign Out</div></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden pb-24 md:pb-8">
            {business?.bannerConfig && <DevelopmentBanner config={business.bannerConfig} />}
            {children}
          </main>

          <div className="md:hidden">
            <BottomNav />
            <QuickActionFAB />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
