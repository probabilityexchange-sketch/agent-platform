import { TelegramSetup } from '@/components/settings/TelegramSetup';

export const metadata = {
  title: 'Telegram Bot Setup',
};

export default function TelegramPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Telegram Bot</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set up a Telegram bot to control Randi directly from your phone.
        </p>
      </div>
      <TelegramSetup />
    </div>
  );
}
