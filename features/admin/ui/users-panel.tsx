'use client';

import {
  ASSIGNABLE_USER_ROLES,
  BAN_DURATION_DAYS,
  isAuthenticatedUser,
  type AdminUserListItem,
  type AssignableUserRole,
  type BanDurationDays,
} from '@/entities/user';
import { useAccess } from '@/features/access';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Ban, Search, ShieldOff, Trash2, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminTabs } from './admin-tabs';

type UserFilter = 'all' | 'active' | 'banned';

interface UsersPanelProps {
  initialUsers: AdminUserListItem[];
}

function getInitials(user: AdminUserListItem): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function displayName(user: AdminUserListItem): string {
  return user.name?.trim() || user.email;
}

export function UsersPanel({ initialUsers }: UsersPanelProps) {
  const t = useTranslations('admin.appUsers');
  const tRoles = useTranslations('profile.roles');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const { profile } = useAccess();
  const currentUserId = isAuthenticatedUser(profile) ? profile.id : null;

  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUserListItem | null>(null);
  const [nextRole, setNextRole] = useState<AssignableUserRole>('USER');
  const [durationDays, setDurationDays] = useState<BanDurationDays>(7);
  const [banReason, setBanReason] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      if (filter === 'active' && user.isBanned) {
        return false;
      }

      if (filter === 'banned' && !user.isBanned) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        user.email.toLowerCase().includes(normalizedQuery) ||
        (user.name?.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });
  }, [filter, query, users]);

  const bannedCount = users.filter((user) => user.isBanned).length;

  const formatDate = (value: string) =>
    format.dateTime(new Date(value), { day: 'numeric', month: 'short', year: 'numeric' });

  const replaceUser = (nextUser: AdminUserListItem) => {
    setUsers((current) => current.map((user) => (user.id === nextUser.id ? nextUser : user)));
  };

  const handleBan = async () => {
    if (!banTarget) {
      return;
    }

    setPendingAction(banTarget.id);

    try {
      const response = await fetch(`/api/admin/users/${banTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban',
          durationDays,
          reason: banReason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('ban_failed');
      }

      const data = (await response.json()) as { user: AdminUserListItem };
      replaceUser(data.user);
      toast.success(t('bannedToast'));
      setBanTarget(null);
      setBanReason('');
      setDurationDays(7);
    } catch {
      toast.error(t('actionError'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnban = async (user: AdminUserListItem) => {
    setPendingAction(user.id);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      });

      if (!response.ok) {
        throw new Error('unban_failed');
      }

      const data = (await response.json()) as { user: AdminUserListItem };
      replaceUser(data.user);
      toast.success(t('unbannedToast'));
    } catch {
      toast.error(t('actionError'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleRoleChange = async () => {
    if (!roleTarget) {
      return;
    }

    setPendingAction(roleTarget.id);

    try {
      const response = await fetch(`/api/admin/users/${roleTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'role', role: nextRole }),
      });

      if (!response.ok) {
        throw new Error('role_failed');
      }

      const data = (await response.json()) as { user: AdminUserListItem };
      replaceUser(data.user);
      toast.success(t('roleChangedToast'));
      setRoleTarget(null);
    } catch {
      toast.error(t('actionError'));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setPendingAction(deleteTarget.id);

    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('delete_failed');
      }

      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      toast.success(t('deletedToast'));
      setDeleteTarget(null);
    } catch {
      toast.error(t('actionError'));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <AdminTabs
          tabs={[
            { value: 'all', label: t('filters.all') },
            { value: 'active', label: t('filters.active') },
            { value: 'banned', label: t('filters.banned') },
          ]}
          value={filter}
          onChange={setFilter}
          ariaLabel={t('description')}
          size="sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{t('count', { count: filteredUsers.length })}</span>
        {bannedCount > 0 && <span>{t('bannedCount', { count: bannedCount })}</span>}
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query.trim() ? t('emptySearch') : t('empty')}
          compact
          showCard={false}
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {filteredUsers.map((user) => {
            const busy = pendingAction === user.id;
            const isYou = user.isCurrentUser || user.id === currentUserId;

            return (
              <li key={user.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {getInitials(user)}
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{displayName(user)}</p>
                      {isYou && (
                        <Badge variant="secondary">{t('you')}</Badge>
                      )}
                      {user.canChangeRole ? (
                        <Select
                          value={user.role}
                          disabled={busy}
                          onValueChange={(value) => {
                            if (value === user.role) {
                              return;
                            }

                            setNextRole(value as AssignableUserRole);
                            setRoleTarget(user);
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={t('changeRole')}
                            className="h-7 min-w-28"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_USER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {tRoles(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.role === 'USER' ? 'outline' : 'default'}>
                          {tRoles(user.role)}
                        </Badge>
                      )}
                      <Badge variant={user.isBanned ? 'destructive' : 'secondary'}>
                        {user.isBanned && user.bannedUntil
                          ? t('statusBanned', { date: formatDate(user.bannedUntil) })
                          : t('statusActive')}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('joined', { date: formatDate(user.createdAt) })}
                      {user.isBanned && user.banReason ? ` · ${t('reason', { reason: user.banReason })}` : ''}
                    </p>
                  </div>
                </div>

                {user.canModerate && (
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    {user.isBanned ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleUnban(user)}
                      >
                        <ShieldOff className="size-3.5" />
                        {t('unban')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setDurationDays(7);
                          setBanReason('');
                          setBanTarget(user);
                        }}
                      >
                        <Ban className="size-3.5" />
                        {t('ban')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={tCommon('delete')}
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBanTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('banTitle')}</DialogTitle>
            <DialogDescription>
              {t('banDescription', { name: banTarget ? displayName(banTarget) : '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ban-duration">{t('banDuration')}</Label>
              <Select
                value={String(durationDays)}
                onValueChange={(value) => setDurationDays(Number(value) as BanDurationDays)}
              >
                <SelectTrigger id="ban-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATION_DAYS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {t(`durations.${days}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ban-reason">{t('banReason')}</Label>
              <Input
                id="ban-reason"
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder={t('banReasonPlaceholder')}
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBanTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              disabled={pendingAction === banTarget?.id}
              className={cn('bg-destructive text-white hover:bg-destructive/90')}
              onClick={() => void handleBan()}
            >
              {t('confirmBan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRoleTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('changeRoleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('changeRoleDescription', {
                name: roleTarget ? displayName(roleTarget) : '',
                from: roleTarget ? tRoles(roleTarget.role) : '',
                to: tRoles(nextRole),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingAction === roleTarget?.id}
              onClick={(event) => {
                event.preventDefault();
                void handleRoleChange();
              }}
            >
              {t('confirmRoleChange')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              {t('deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription', { name: deleteTarget ? displayName(deleteTarget) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingAction === deleteTarget?.id}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
