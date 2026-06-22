export function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950/20 mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-600">
        <p>© 2026 Nexora Technologies Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-neutral-400 transition-colors">Documentation</a>
          <a href="#" className="hover:text-neutral-400 transition-colors">API Reference</a>
          <a href="#" className="hover:text-neutral-400 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  )
}