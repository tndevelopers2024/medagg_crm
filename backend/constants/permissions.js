/**
 * Master permission constants for the Role Management System.
 * Hierarchical structure: Module > Screen > Action/Filter
 *
 * Exported as:
 *   PERMISSION_TREE  – nested object for UI rendering
 *   ALL_PERMISSION_KEYS – flat array of every permission string (for validation)
 */

const PERMISSION_TREE = {
  dashboard: {
    label: "Dashboard",
    children: {
      dashboard: {
        label: "Dashboard",
        permissions: [
          { key: "dashboard.dashboard.view", label: "View All Dashboard" },
          { key: "dashboard.dashboard.viewAssigned", label: "View Assigned Analytics" },
          { key: "dashboard.team.view", label: "View Team Analytics" },
          { key: "dashboard.dashboard.kpiStats", label: "KPI Stats" },
          { key: "dashboard.dashboard.cityTable", label: "City Table" },
          { key: "dashboard.dashboard.doctorTable", label: "Doctor Table" },
          { key: "dashboard.dashboard.campaignAnalytics", label: "Campaign Analytics" },
          { key: "dashboard.dashboard.bdPerformance", label: "BD Performance" },
          { key: "dashboard.dashboard.dateFilter", label: "Date Filter" },
        ],
      },
    },
  },

  leads: {
    label: "Leads",
    children: {
      search: {
        label: "Search",
        permissions: [
          { key: "leads.search.view", label: "View Search" },
        ],
      },
      all: {
        label: "All Leads",
        permissions: [
          { key: "leads.all.view", label: "View All Leads" },
          { key: "leads.team.view", label: "View Team Leads" },
          { key: "leads.assigned.view", label: "View Assigned Leads" },
          { key: "leads.all.create", label: "Create Lead" },
          { key: "leads.all.edit", label: "Edit Lead" },
          { key: "leads.all.delete", label: "Delete Lead" },
          { key: "leads.all.assign", label: "Assign Lead" },
          { key: "leads.all.bulkUpdate", label: "Bulk Update" },
          { key: "leads.all.export", label: "Export Leads" },
          { key: "leads.all.filters.status", label: "Filter: Status" },
          { key: "leads.all.filters.caller", label: "Filter: Caller" },
          { key: "leads.all.filters.source", label: "Filter: Source" },
          { key: "leads.all.filters.campaign", label: "Filter: Campaign" },
          { key: "leads.all.filters.opdStatus", label: "Filter: OPD Status" },
          { key: "leads.all.filters.ipdStatus", label: "Filter: IPD Status" },
          { key: "leads.all.filters.diagnostics", label: "Filter: Diagnostics" },
          { key: "leads.all.filters.followup", label: "Filter: Follow-up" },
          { key: "leads.all.filters.date", label: "Filter: Date" },
          { key: "leads.all.filters.customFields", label: "Filter: Custom Fields" },
        ],
      },
      detail: {
        label: "Lead Detail",
        permissions: [
          { key: "leads.detail.view", label: "View Lead Detail" },
          { key: "leads.detail.editFields", label: "Edit Fields" },
          { key: "leads.detail.editStatus", label: "Edit Status" },
          { key: "leads.detail.addNotes", label: "Add Notes" },
          { key: "leads.detail.viewActivities", label: "View Activities" },
          { key: "leads.detail.manageBookings", label: "Manage Bookings" },
          { key: "leads.detail.whatsapp", label: "WhatsApp" },
          { key: "leads.detail.documents", label: "Documents" },
          { key: "leads.detail.calls", label: "Calls" },
          { key: "leads.detail.defer", label: "Defer" },
          { key: "leads.detail.helpRequest", label: "Help Request" },
        ],
      },
      duplicates: {
        label: "Duplicates",
        permissions: [
          { key: "leads.duplicates.view", label: "View Duplicates" },
          { key: "leads.duplicates.merge", label: "Merge Duplicates" },
        ],
      },
    },
  },

  campaigns: {
    label: "Campaigns",
    children: {
      campaigns: {
        label: "Campaigns",
        permissions: [
          { key: "campaigns.campaigns.view", label: "View Campaigns" },
          { key: "campaigns.campaigns.create", label: "Create Campaign" },
          { key: "campaigns.campaigns.edit", label: "Edit Campaign" },
          { key: "campaigns.campaigns.delete", label: "Delete Campaign" },
          { key: "campaigns.campaigns.sync", label: "Sync Campaign" },
        ],
      },
      import: {
        label: "Import",
        permissions: [
          { key: "campaigns.import.view", label: "View Import" },
          { key: "campaigns.import.import", label: "Import Leads" },
          { key: "campaigns.import.mapColumns", label: "Map Columns" },
          { key: "campaigns.import.assignCallers", label: "Assign Callers" },
        ],
      },
    },
  },

  callers: {
    label: "Callers",
    children: {
      callers: {
        label: "Callers",
        permissions: [
          { key: "callers.callers.view", label: "View Callers" },
          { key: "callers.team.view", label: "View Team Callers" },
          { key: "callers.callers.create", label: "Create Caller" },
          { key: "callers.callers.edit", label: "Edit Caller" },
          { key: "callers.callers.delete", label: "Delete Caller" },
        ],
      },
      callerDetail: {
        label: "Caller Detail",
        permissions: [
          { key: "callers.callerDetail.view", label: "View Caller Detail" },
          { key: "callers.callerDetail.viewStats", label: "View Stats" },
        ],
      },
    },
  },

  analytics: {
    label: "Analytics",
    children: {
      analytics: {
        label: "Analytics",
        permissions: [
          { key: "analytics.analytics.view", label: "View Analytics" },
          { key: "analytics.analytics.statusChart", label: "Status Chart" },
          { key: "analytics.analytics.lostReasons", label: "Lost Reasons" },
          { key: "analytics.analytics.assigneeChart", label: "Assignee Chart" },
          { key: "analytics.analytics.ratingChart", label: "Rating Chart" },
          { key: "analytics.analytics.callStatusChart", label: "Call Status Chart" },
          { key: "analytics.analytics.callsCountChart", label: "Calls Count Chart" },
          { key: "analytics.analytics.customFieldCharts", label: "Custom Field Charts" },
          { key: "analytics.analytics.export", label: "Export Analytics" },
        ],
      },
    },
  },

  reports: {
    label: "Reports",
    children: {
      reports: {
        label: "Reports",
        permissions: [
          { key: "reports.reports.view", label: "View Reports" },
          { key: "reports.reports.callerPerformance", label: "Caller Performance" },
        ],
      },
    },
  },

  settings: {
    label: "Settings",
    children: {
      fieldSettings: {
        label: "Lead Fields",
        permissions: [
          { key: "settings.fieldSettings.view", label: "View Lead Fields" },
          { key: "settings.fieldSettings.create", label: "Create Field" },
          { key: "settings.fieldSettings.edit", label: "Edit Field" },
          { key: "settings.fieldSettings.delete", label: "Delete Field" },
          { key: "settings.fieldSettings.reorder", label: "Reorder Fields" },
        ],
      },
      bookingFields: {
        label: "Booking Fields",
        permissions: [
          { key: "settings.bookingFields.view", label: "View Booking Fields" },
          { key: "settings.bookingFields.create", label: "Create Booking Field" },
          { key: "settings.bookingFields.edit", label: "Edit Booking Field" },
          { key: "settings.bookingFields.delete", label: "Delete Booking Field" },
          { key: "settings.bookingFields.reorder", label: "Reorder Booking Fields" },
        ],
      },
      leadStages: {
        label: "Lead Stages",
        permissions: [
          { key: "settings.leadStages.view", label: "View Lead Stages" },
          { key: "settings.leadStages.create", label: "Create Stage" },
          { key: "settings.leadStages.edit", label: "Edit Stage" },
          { key: "settings.leadStages.delete", label: "Delete Stage" },
          { key: "settings.leadStages.reorder", label: "Reorder Stages" },
        ],
      },
    },
  },

  roles: {
    label: "Roles",
    children: {
      roles: {
        label: "Roles",
        permissions: [
          { key: "roles.roles.view", label: "View Roles" },
          { key: "roles.roles.create", label: "Create Role" },
          { key: "roles.roles.edit", label: "Edit Role" },
          { key: "roles.roles.delete", label: "Delete Role" },
        ],
      },
    },
  },

  teams: {
    label: "Teams",
    children: {
      teams: {
        label: "Teams",
        permissions: [
          { key: "teams.teams.view", label: "View Teams" },
          { key: "teams.teams.create", label: "Create Team" },
          { key: "teams.teams.edit", label: "Edit Team" },
          { key: "teams.teams.delete", label: "Delete Team" },
        ],
      },
    },
  },

  alarms: {
    label: "Alarms",
    children: {
      alarms: {
        label: "Alarms",
        permissions: [
          { key: "alarms.alarms.view", label: "View Alarms" },
          { key: "alarms.alarms.create", label: "Create Alarm" },
          { key: "alarms.alarms.edit", label: "Edit Alarm" },
          { key: "alarms.alarms.delete", label: "Delete Alarm" },
        ],
      },
    },
  },
};

// Flatten the tree into a flat array of all permission key strings
function flattenTree(tree) {
  const keys = [];
  for (const mod of Object.values(tree)) {
    for (const screen of Object.values(mod.children || {})) {
      for (const perm of screen.permissions || []) {
        keys.push(perm.key);
      }
    }
  }
  return keys;
}

const ALL_PERMISSION_KEYS = flattenTree(PERMISSION_TREE);

/**
 * Default permissions pre-checked when creating any new role.
 * These represent the minimum common access every role typically needs.
 */
const DEFAULT_PERMISSIONS = [
  // Dashboard — view own assigned analytics
  "dashboard.dashboard.viewAssigned",
  "dashboard.dashboard.kpiStats",
  "dashboard.dashboard.dateFilter",

  // Leads — search & view assigned
  "leads.search.view",
  "leads.assigned.view",

  // Lead detail — core operations
  "leads.detail.view",
  "leads.detail.editFields",
  "leads.detail.editStatus",
  "leads.detail.addNotes",
  "leads.detail.viewActivities",
  "leads.detail.manageBookings",
  "leads.detail.whatsapp",
  "leads.detail.documents",
  "leads.detail.calls",
  "leads.detail.defer",
  "leads.detail.helpRequest",

  // Common filters
  "leads.all.filters.status",
  "leads.all.filters.source",
  "leads.all.filters.campaign",
  "leads.all.filters.opdStatus",
  "leads.all.filters.ipdStatus",
  "leads.all.filters.diagnostics",
  "leads.all.filters.followup",
  "leads.all.filters.date",
  "leads.all.filters.customFields",

  // Internal views — needed inside other screens (dropdowns, references, etc.)
  "callers.callers.view",
  "campaigns.campaigns.view",
  "settings.fieldSettings.view",
  "settings.bookingFields.view",
  "settings.leadStages.view",

  // Alarms — view & manage own
  "alarms.alarms.view",
  "alarms.alarms.create",
  "alarms.alarms.edit",
  "alarms.alarms.delete",
];

module.exports = { PERMISSION_TREE, ALL_PERMISSION_KEYS, DEFAULT_PERMISSIONS };
