export default function ForwarderDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Forwarder Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Pending Orders</h3>
          <p className="text-3xl font-bold text-blue-600">24</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Ready to Ship</h3>
          <p className="text-3xl font-bold text-green-600">8</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Capacity Used</h3>
          <p className="text-3xl font-bold text-purple-600">67%</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 border rounded-lg hover:bg-gray-50">
            Print Labels
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50">
            Bulk Assign
          </button>
        </div>
      </div>
    </div>
  );
}