Ext.define('SlateAdmin.view.progress.interims.StudentsGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'progress-interims-studentsgrid',
    requires: [
        'Ext.grid.column.Date'
    ],


    width: 250,
    cls: 'progress-interims-studentsgrid',

    viewConfig: {
        getRowClass: function(student) {
            return 'status-' + (student.get('report_status') || 'pending').toLowerCase();
        },
        emptyText: 'You are not currently an instructor for any students',
        loadingText: 'Loading students&hellip;'
    },
    store: 'progress.interims.Students',
    columns: [
        {
            flex: 1,

            text: 'Student',
            dataIndex: 'SortName'
        },
        {
            width: 80,

            text: 'Status',
            dataIndex: 'report_status',
            emptyCellText: '&mdash;'
        },
        {
            width: 148,

            xtype: 'datecolumn',
            text: 'Last Modified',
            dataIndex: 'report_modified',
            format: 'n/j/y g:i A',
            emptyCellText: '&mdash;'
        }
    ]
});