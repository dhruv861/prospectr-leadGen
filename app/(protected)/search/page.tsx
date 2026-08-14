import SearchForm from "./SearchForm";

export default function SearchPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search Google Maps for businesses without a website in a given industry and locality.
        </p>
      </div>
      <SearchForm />
    </div>
  );
}
