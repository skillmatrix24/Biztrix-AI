
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateDocumentNonBlocking } from '@/firebase';
import { toast } from '@/hooks/use-toast';

export function BannerTab({ business, businessRef, isAdmin }: { business: any, businessRef: any, isAdmin: boolean }) {
  const [bannerConfig, setBannerConfig] = useState(business?.bannerConfig || { isEnabled: false, message: 'Website under active development.' });

  const handleSave = () => {
    if (!isAdmin || !businessRef) return;
    updateDocumentNonBlocking(businessRef, { bannerConfig });
    toast({ title: "Banner Config Saved" });
  };

  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-900">Notification Banner</CardTitle>
        <CardDescription>Manage the top notification banner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
          <Label className="text-sm font-bold">Enable Banner</Label>
          <Switch 
            checked={bannerConfig.isEnabled} 
            onCheckedChange={(checked) => setBannerConfig({ ...bannerConfig, isEnabled: checked })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold">Banner Message</Label>
          <Input 
            value={bannerConfig.message} 
            onChange={(e) => setBannerConfig({ ...bannerConfig, message: e.target.value })}
            placeholder="Enter banner message..."
          />
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
          Save Banner Config
        </Button>
      </CardContent>
    </Card>
  );
}
