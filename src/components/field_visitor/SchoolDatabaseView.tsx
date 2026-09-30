import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  getAvailableOrganizations,
  OrganizationOption,
} from "../../utils/field_visitor_api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Search, School, Phone, Mail, Globe, ArrowRight, Building2, MapPin } from "lucide-react";

interface SchoolDatabaseViewProps {
  onSelectSchoolForVisit: (orgId: number) => void;
}

export const SchoolDatabaseView: React.FC<SchoolDatabaseViewProps> = ({
  onSelectSchoolForVisit,
}) => {
  const { theme } = useTheme();
  const [orgs, setOrgs] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    const res = await getAvailableOrganizations();
    if (res.success) {
      setOrgs(res.organizations);
    }
    setLoading(false);
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.domain || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.principal_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`users-container text-sm sm:text-base max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={`users-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
        <CardHeader className="users-card-header border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className={`users-card-title text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              School & Institution Database
            </CardTitle>
            <p className={`users-card-desc text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Browse and inspect registered institutions under your organization
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1">
            {filtered.length} Institutions
          </Badge>
        </CardHeader>

        <CardContent className="users-card-content pt-4 pb-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search school name, domain, principal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 h-10 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-300'}`}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Showing {filtered.length} of {orgs.length} registered institutions
            </div>
          </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading institution database...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-border p-8 text-center">
          <School className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-40" />
          <h4 className="font-semibold text-foreground text-sm">No Institutions Found</h4>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <Card
              key={org.id}
              className="border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow flex flex-col justify-between"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 line-clamp-1">
                      <School className="w-4 h-4 text-primary shrink-0" />
                      {org.name}
                    </h4>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3" />
                      <span>{org.domain || "Internal Campus"}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {org.institution_type || "Institution"}
                  </Badge>
                </div>

                {/* Principal Info */}
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1">
                  <div className="font-medium text-foreground">
                    Principal: {org.principal_name || "Principal In-Charge"}
                  </div>
                  {org.principal_phone && (
                    <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                      <Phone className="w-3 h-3" />
                      <span>{org.principal_phone}</span>
                    </div>
                  )}
                  {org.principal_email && (
                    <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] truncate">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{org.principal_email}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => onSelectSchoolForVisit(org.id)}
                  className="w-full text-xs gap-1.5 mt-2 bg-primary/90 hover:bg-primary"
                  size="sm"
                >
                  <span>Record Visit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
