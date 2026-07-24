
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { Notification } from "@/lib/types";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const notificationsQuery = useMemo(() => {
        // Ensure both user and firestore are available before creating the query
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('timestamp', 'desc')
        );
    }, [user, firestore]);

    const { data: notifications, loading: notificationsLoading } = useCollection<Notification>(notificationsQuery);

    const handleNotificationClick = async (notification: Notification) => {
        if (!user || !firestore || notification.read) {
            if (notification.link) {
                router.push(notification.link);
            }
            return;
        };
        const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id!);
        await updateDoc(notifRef, { read: true });
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const isLoading = userLoading || notificationsLoading;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center">
                <h1 className="font-semibold text-lg md:text-2xl">All Notifications</h1>
            </div>
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Your Notifications</CardTitle>
                    <CardDescription>A complete history of all notifications for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center text-muted-foreground py-12">Loading notifications...</p>
                    ) : notifications && notifications.length > 0 ? (
                        <ul className="divide-y divide-border/50 divide-dashed">
                            {notifications.map(notif => (
                                <li key={notif.id} className={`p-4 transition-colors cursor-pointer ${notif.read ? 'hover:bg-accent/50' : 'bg-accent hover:bg-accent/80'}`} onClick={() => handleNotificationClick(notif)}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                                            {notif.read ? <Mail className="w-4 h-4 text-muted-foreground" /> : <BellRing className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{notif.title}</p>
                                            <p className="text-sm text-muted-foreground">{notif.message}</p>
                                            {notif.link && (
                                                <span className="text-xs text-primary hover:underline">View Details</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">You have no notifications.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

