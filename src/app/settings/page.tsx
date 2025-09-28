import StoreApiKey from "./StoreApiKey";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage the API keys used for different AI providers.
        </p>
      </div>
      <StoreApiKey />
    </div>
  );
}
