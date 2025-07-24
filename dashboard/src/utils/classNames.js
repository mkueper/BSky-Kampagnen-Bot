// utils/classNames.js
export function classNames(...args) {
  return args.filter(Boolean).join(" ");
}
