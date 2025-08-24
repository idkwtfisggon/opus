import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/staff";
import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      throw new Response("Forwarder profile not found", { status: 404 });
    }

    return { 
      forwarder,
      userId
    };
  } catch (error) {
    console.error("Error loading staff data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function StaffManagement({ loaderData }: Route.ComponentProps) {
  const { forwarder } = loaderData;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<any>(null);

  // Get real-time data
  const staff = useQuery(api.staff.getForwarderStaff, { forwarderId: forwarder._id });
  const warehouses = useQuery(api.warehouses.getForwarderWarehouses, { forwarderId: forwarder._id });
  const performanceMetrics = useQuery(api.staff.getStaffPerformanceMetrics, { forwarderId: forwarder._id });

  // Mutations
  const createStaff = useMutation(api.staff.createStaff);
  const updateStaff = useMutation(api.staff.updateStaff);
  const deactivateStaff = useMutation(api.staff.deactivateStaff);
  const generateInviteCode = useMutation(api.staff.generateStaffInviteCode);

  const handleCreateStaff = async (formData: any) => {
    try {
      // Generate invite code instead of creating staff directly
      const result = await generateInviteCode({
        forwarderId: forwarder._id,
        warehouseId: formData.warehouseId,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions
      });
      
      const inviteUrl = `${window.location.origin}/staff-signup`;
      
      // Show invite details with copy/email options
      setShowCreateForm(false);
      showInviteResult({
        email: formData.email,
        name: formData.name,
        inviteCode: result.inviteCode,
        inviteUrl,
        warehouse: warehouses?.find(w => w._id === formData.warehouseId)?.name
      });
    } catch (error) {
      alert(`Failed to generate invite: ${error.message}`);
    }
  };

  const showInviteResult = (data: any) => {
    setInviteResult(data);
  };

  const copyInviteMessage = () => {
    const copyText = `Hi ${inviteResult.name}!\n\nYou've been invited to join our warehouse team.\n\nSignup URL: ${inviteResult.inviteUrl}\nInvite Code: ${inviteResult.inviteCode}\n\nThis code expires in 7 days.`;
    
    navigator.clipboard.writeText(copyText);
    alert("Invite message copied to clipboard!");
  };

  const handleDeactivateStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;
    
    try {
      await deactivateStaff({ staffId });
    } catch (error) {
      alert(`Failed to deactivate staff: ${error.message}`);
    }
  };


  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'warehouse_worker': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!staff || !warehouses) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your warehouse staff and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all duration-200"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Performance Overview */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-foreground">Total Staff</h3>
              <div className="w-2 h-2 rounded-full bg-blue-500 opacity-60"></div>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              {performanceMetrics.totalStaff}
            </p>
            <p className="text-sm text-muted-foreground">
              {performanceMetrics.activeStaffToday} active today
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-foreground">Daily Scans</h3>
              <div className="w-2 h-2 rounded-full bg-green-500 opacity-60"></div>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">
              {performanceMetrics.totalScans}
            </p>
            <p className="text-sm text-muted-foreground">Packages scanned today</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-foreground">Status Updates</h3>
              <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-60"></div>
            </div>
            <p className="text-3xl font-bold text-yellow-600 mb-2">
              {performanceMetrics.totalStatusUpdates}
            </p>
            <p className="text-sm text-muted-foreground">Order status changes</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-foreground">Warehouses</h3>
              <div className="w-2 h-2 rounded-full bg-purple-500 opacity-60"></div>
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-2">
              {warehouses.length}
            </p>
            <p className="text-sm text-muted-foreground">Active locations</p>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-card border border-border rounded-xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Staff Members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.length} staff members across {warehouses.length} warehouses
          </p>
        </div>

        {staff.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Staff Members Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first staff member to start managing warehouse operations.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all"
            >
              + Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {staff.map((staffMember) => (
              <div key={staffMember._id} className="p-6 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{staffMember.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(staffMember.role)}`}>
                        {staffMember.role.replace('_', ' ')}
                      </span>
                      {!staffMember.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{staffMember.email}</p>
                    {staffMember.phone && (
                      <p className="text-sm text-muted-foreground mb-2">{staffMember.phone}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {staffMember.warehouses.map((warehouse) => (
                        <span key={warehouse._id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                          {warehouse.name} ({warehouse.city})
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {staffMember.permissions.canScanBarcodes && <span>✓ Barcode Scanning</span>}
                      {staffMember.permissions.canUpdateOrderStatus && <span>✓ Status Updates</span>}
                      {staffMember.permissions.canPrintLabels && <span>✓ Label Printing</span>}
                      {staffMember.permissions.canViewReports && <span>✓ View Reports</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedStaff(staffMember._id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details
                    </button>
                    {staffMember.isActive && (
                      <button
                        onClick={() => handleDeactivateStaff(staffMember._id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>

                {/* Performance metrics for this staff member */}
                {performanceMetrics && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {(() => {
                      const staffMetric = performanceMetrics.staffMetrics.find(s => s.staffId === staffMember._id);
                      if (!staffMetric) return null;
                      
                      return (
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-foreground">{staffMetric.scans}</div>
                            <div className="text-xs text-muted-foreground">Scans Today</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-foreground">{staffMetric.statusUpdates}</div>
                            <div className="text-xs text-muted-foreground">Status Updates</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-foreground">{staffMetric.ordersProcessed}</div>
                            <div className="text-xs text-muted-foreground">Orders Processed</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-foreground">{staffMetric.avgProcessingTime}s</div>
                            <div className="text-xs text-muted-foreground">Avg Processing</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      {showCreateForm && (
        <CreateStaffModal
          warehouses={warehouses}
          onSubmit={handleCreateStaff}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Invite Success Modal */}
      {inviteResult && (
        <InviteSuccessModal
          inviteData={inviteResult}
          onCopy={copyInviteMessage}
          onClose={() => setInviteResult(null)}
        />
      )}
    </div>
  );
}

// Create Staff Modal Component
function CreateStaffModal({
  warehouses,
  onSubmit,
  onCancel
}: {
  warehouses: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "warehouse_worker" as const,
    warehouseId: "",
    permissions: {
      canUpdateOrderStatus: true,
      canPrintLabels: true,
      canScanBarcodes: true,
      canViewReports: false,
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.warehouseId) {
      alert("Please fill in all required fields");
      return;
    }

    // Generate a temporary userId (in real implementation, this would come from Clerk)
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    onSubmit({
      ...formData,
      userId: tempUserId
    });
  };


  const handleRoleChange = (role: typeof formData.role) => {
    // Set default permissions based on role
    const defaultPermissions = {
      warehouse_worker: {
        canUpdateOrderStatus: true,
        canPrintLabels: true,
        canScanBarcodes: true,
        canViewReports: false,
      },
      supervisor: {
        canUpdateOrderStatus: true,
        canPrintLabels: true,
        canScanBarcodes: true,
        canViewReports: true,
      },
      manager: {
        canUpdateOrderStatus: true,
        canPrintLabels: true,
        canScanBarcodes: true,
        canViewReports: true,
      }
    };

    setFormData(prev => ({
      ...prev,
      role,
      permissions: defaultPermissions[role]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Add New Staff Member</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate an invite code and signup link for a new staff member</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value as typeof formData.role)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="warehouse_worker">Warehouse Worker</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Warehouse *</label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Select a warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} ({warehouse.city}, {warehouse.state})
                  </option>
                ))}
              </select>
              {warehouses.length === 0 && (
                <p className="text-sm text-red-600 mt-1">No warehouses available. Please create a warehouse first.</p>
              )}
            </div>
          </div>

          {/* Permissions Preview */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Permissions (based on role)</label>
            <div className="bg-muted p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`flex items-center gap-2 ${formData.permissions.canScanBarcodes ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formData.permissions.canScanBarcodes ? '✅' : '❌'} Scan Barcodes
                </div>
                <div className={`flex items-center gap-2 ${formData.permissions.canUpdateOrderStatus ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formData.permissions.canUpdateOrderStatus ? '✅' : '❌'} Update Status
                </div>
                <div className={`flex items-center gap-2 ${formData.permissions.canPrintLabels ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formData.permissions.canPrintLabels ? '✅' : '❌'} Print Labels
                </div>
                <div className={`flex items-center gap-2 ${formData.permissions.canViewReports ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formData.permissions.canViewReports ? '✅' : '❌'} View Reports
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Generate Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Invite Success Modal Component
function InviteSuccessModal({
  inviteData,
  onCopy,
  onClose
}: {
  inviteData: any;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Invite Generated!</h2>
              <p className="text-sm text-muted-foreground">Staff member invite is ready to send</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Staff Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-foreground">Name:</span>
                <p className="text-muted-foreground">{inviteData.name}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Email:</span>
                <p className="text-muted-foreground">{inviteData.email}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Warehouse:</span>
                <p className="text-muted-foreground">{inviteData.warehouse}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Expires:</span>
                <p className="text-muted-foreground">7 days</p>
              </div>
            </div>
          </div>

          {/* Invite Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Invite Code</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border border-border px-3 py-2 rounded-lg font-mono text-lg font-bold text-primary">
                  {inviteData.inviteCode}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteData.inviteCode)}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  title="Copy code"
                >
                  📋
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Signup URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteData.inviteUrl}
                  readOnly
                  className="flex-1 bg-background border border-border px-3 py-2 rounded-lg text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteData.inviteUrl)}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  title="Copy URL"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          {/* Preview Message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Message Preview</label>
            <div className="bg-background border border-border p-3 rounded-lg text-sm text-muted-foreground">
              <div className="whitespace-pre-line">
                {`Hi ${inviteData.name}!

You've been invited to join our warehouse team.

Signup URL: ${inviteData.inviteUrl}
Invite Code: ${inviteData.inviteCode}

This code expires in 7 days.`}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Close
          </button>
          <button
            onClick={onCopy}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            📋 Copy Message
          </button>
        </div>
      </div>
    </div>
  );
}