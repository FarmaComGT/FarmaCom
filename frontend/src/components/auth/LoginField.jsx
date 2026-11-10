export default function LoginField({ id, label, type, value, onChange, placeholder, icon: Icon }) {
  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-on-surface-variant"
      >
        {label}
      </label>
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 transition-colors focus-within:border-primary">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full border-none bg-transparent text-base text-on-surface placeholder:text-[color:var(--ui-placeholder)] focus:outline-none"
        />
        <Icon className="h-4 w-4 shrink-0 text-on-surface-variant" />
      </div>
    </div>
  );
}
