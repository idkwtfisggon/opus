import { Outlet } from "react-router";

export default function ForwarderLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="text-xl font-semibold text-sidebar-foreground tracking-tight">
            Logistics Hub
          </h2>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Forwarder Portal</p>
        </div>
        
        <nav className="p-4 space-y-2">
          <a href="/forwarder" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0a2 2 0 012-2h14a2 2 0 012 2v2H3V7z" />
            </svg>
            Dashboard
          </a>
          
          <a href="/forwarder/orders" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Manage Orders
          </a>
          
          <a href="/forwarder/warehouses" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Warehouses
          </a>
          
          <a href="/forwarder/analytics" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </a>
          
          <a href="/forwarder/settings" 
             className="flex items-center px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}