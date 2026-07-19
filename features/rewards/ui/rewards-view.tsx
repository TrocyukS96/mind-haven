'use client';

import type { Reward } from '@/entities/reward/model/types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { BookOpen, GraduationCap, Percent, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

const ICON_MAP = {
  percent: Percent,
  book: BookOpen,
  'graduation-cap': GraduationCap,
  star: Star,
} as const;

function RewardIcon({ icon }: { icon?: string }) {
  const Icon = ICON_MAP[icon as keyof typeof ICON_MAP] ?? Star;
  return <Icon size={20} className="text-primary" />;
}

function RewardCard({
  reward,
  balance,
  onClaim,
  onDelete,
}: {
  reward: Reward;
  balance: number;
  onClaim: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const t = useTranslations('rewards');
  const isClaimed = Boolean(reward.claimedAt);
  const isAvailable = !isClaimed && balance >= reward.cost;
  const remaining = Math.max(0, reward.cost - balance);

  const title = reward.titleKey ? t(reward.titleKey) : reward.title;
  const description = reward.descriptionKey
    ? t(reward.descriptionKey)
    : reward.description;

  return (
    <Card className={isAvailable ? 'border-primary/40 bg-primary/5' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <RewardIcon icon={reward.icon} />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {reward.cost} ⭐
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isClaimed
            ? t('claimed')
            : isAvailable
              ? t('available')
              : t('locked', { remaining })}
        </p>
        <div className="flex gap-2">
          {onDelete && reward.type === 'personal' && !isClaimed && (
            <Button variant="outline" size="sm" onClick={() => onDelete(reward.id)}>
              <Trash2 size={14} />
              <span className="sr-only">{t('delete')}</span>
            </Button>
          )}
          {!isClaimed && (
            <Button size="sm" disabled={!isAvailable} onClick={() => onClaim(reward.id)}>
              {t('claim')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RewardsView() {
  const t = useTranslations('rewards');
  const balance = useStore((state) => state.balance);
  const rating = useStore((state) => state.rating);
  const rewards = useStore((state) => state.rewards);
  const claimReward = useStore((state) => state.claimReward);
  const addPersonalReward = useStore((state) => state.addPersonalReward);
  const deletePersonalReward = useStore((state) => state.deletePersonalReward);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('100');

  const platformRewards = rewards.filter((reward) => reward.type === 'platform');
  const personalRewards = rewards.filter((reward) => reward.type === 'personal');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    addPersonalReward({
      title: trimmedTitle,
      description: description.trim() || undefined,
      cost: Number(cost) || 100,
      icon: 'star',
    });

    setTitle('');
    setDescription('');
    setCost('100');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
            {t('balance', { balance })}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 font-medium">
            {t('rating', { rating })}
          </span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t('platformRewards')}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              balance={balance}
              onClaim={claimReward}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">{t('personalRewards')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('personalHint')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('createPersonal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reward-title">{t('titleLabel')}</Label>
                <Input
                  id="reward-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('titlePlaceholder')}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reward-description">{t('descriptionLabel')}</Label>
                <Textarea
                  id="reward-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-cost">{t('costLabel')}</Label>
                <Input
                  id="reward-cost"
                  type="number"
                  min={1}
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit">{t('addReward')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {personalRewards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {personalRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                onClaim={claimReward}
                onDelete={deletePersonalReward}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
