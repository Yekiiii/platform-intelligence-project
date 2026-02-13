export default function KPICard({ title, value, change, changeType }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-12 w-12 rounded-md flex items-center justify-center bg-indigo-100 text-indigo-600`}>
               <span className="text-xl font-bold">{title[0]}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {change && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className={`font-medium ${changeType === 'negative' ? 'text-red-600' : 'text-green-600'}`}>
              {change}
            </span>
            <span className="text-gray-500"> vs previous</span>
          </div>
        </div>
      )}
    </div>
  )
}
