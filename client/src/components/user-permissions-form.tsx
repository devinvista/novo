import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Solution, ServiceLine, Service } from "@shared/schema";

interface UserPermissionsFormProps {
  onPermissionsChange: (permissions: {
    solutionIds: number[];
    serviceLineIds: number[];
    serviceIds: number[];
  }) => void;
  initialPermissions?: {
    solutionIds?: number[];
    serviceLineIds?: number[];
    serviceIds?: number[];
  };
}

export function UserPermissionsForm({ 
  onPermissionsChange, 
  initialPermissions 
}: UserPermissionsFormProps) {
  const [selectedSolutions, setSelectedSolutions] = useState<number[]>(
    initialPermissions?.solutionIds || []
  );
  const [selectedServiceLines, setSelectedServiceLines] = useState<number[]>(
    initialPermissions?.serviceLineIds || []
  );
  const [selectedServices, setSelectedServices] = useState<number[]>(
    initialPermissions?.serviceIds || []
  );

  // Fetch solutions
  const { data: solutions = [] } = useQuery<Solution[]>({
    queryKey: ['/api/solutions'],
  });

  // Fetch service lines
  const { data: serviceLines = [] } = useQuery<ServiceLine[]>({
    queryKey: ['/api/service-lines'],
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  // Update parent component when permissions change
  useEffect(() => {
    onPermissionsChange({
      solutionIds: selectedSolutions,
      serviceLineIds: selectedServiceLines,
      serviceIds: selectedServices,
    });
  }, [selectedSolutions, selectedServiceLines, selectedServices, onPermissionsChange]);

  const handleSolutionChange = (solutionId: number, checked: boolean) => {
    if (checked) {
      setSelectedSolutions(prev => [...prev, solutionId]);
    } else {
      setSelectedSolutions(prev => prev.filter(id => id !== solutionId));
      // Remove related service lines and services
      const relatedServiceLines = serviceLines
        .filter(sl => sl.solutionId === solutionId)
        .map(sl => sl.id);
      setSelectedServiceLines(prev => prev.filter(id => !relatedServiceLines.includes(id)));
      
      const relatedServices = services
        .filter(s => relatedServiceLines.includes(s.serviceLineId))
        .map(s => s.id);
      setSelectedServices(prev => prev.filter(id => !relatedServices.includes(id)));
    }
  };

  const handleServiceLineChange = (serviceLineId: number, checked: boolean) => {
    if (checked) {
      setSelectedServiceLines(prev => [...prev, serviceLineId]);
      // Auto-select parent solution
      const serviceLine = serviceLines.find(sl => sl.id === serviceLineId);
      if (serviceLine && !selectedSolutions.includes(serviceLine.solutionId)) {
        setSelectedSolutions(prev => [...prev, serviceLine.solutionId]);
      }
    } else {
      setSelectedServiceLines(prev => prev.filter(id => id !== serviceLineId));
      // Remove related services
      const relatedServices = services
        .filter(s => s.serviceLineId === serviceLineId)
        .map(s => s.id);
      setSelectedServices(prev => prev.filter(id => !relatedServices.includes(id)));
    }
  };

  const handleServiceChange = (serviceId: number, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
      // Auto-select parent service line and solution
      const service = services.find(s => s.id === serviceId);
      if (service) {
        if (!selectedServiceLines.includes(service.serviceLineId)) {
          setSelectedServiceLines(prev => [...prev, service.serviceLineId]);
        }
        const serviceLine = serviceLines.find(sl => sl.id === service.serviceLineId);
        if (serviceLine && !selectedSolutions.includes(serviceLine.solutionId)) {
          setSelectedSolutions(prev => [...prev, serviceLine.solutionId]);
        }
      }
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const getServiceLinesBySolution = (solutionId: number) => {
    return serviceLines.filter(sl => sl.solutionId === solutionId);
  };

  const getServicesByServiceLine = (serviceLineId: number) => {
    return services.filter(s => s.serviceLineId === serviceLineId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Configurar Acesso às Soluções e Serviços
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecione as soluções, linhas de serviço e serviços específicos que este usuário poderá acessar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {solutions.map((solution) => {
          const solutionServiceLines = getServiceLinesBySolution(solution.id);
          const isSolutionSelected = selectedSolutions.includes(solution.id);
          
          return (
            <div key={solution.id} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`solution-${solution.id}`}
                  checked={isSolutionSelected}
                  onCheckedChange={(checked) => 
                    handleSolutionChange(solution.id, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`solution-${solution.id}`}
                  className="font-medium text-sm"
                >
                  {solution.name}
                </Label>
                <Badge variant="outline" className="text-xs">
                  Solução
                </Badge>
              </div>

              {isSolutionSelected && solutionServiceLines.length > 0 && (
                <div className="ml-6 space-y-2">
                  {solutionServiceLines.map((serviceLine) => {
                    const serviceLineServices = getServicesByServiceLine(serviceLine.id);
                    const isServiceLineSelected = selectedServiceLines.includes(serviceLine.id);
                    
                    return (
                      <div key={serviceLine.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`serviceline-${serviceLine.id}`}
                            checked={isServiceLineSelected}
                            onCheckedChange={(checked) => 
                              handleServiceLineChange(serviceLine.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`serviceline-${serviceLine.id}`}
                            className="text-sm"
                          >
                            {serviceLine.name}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            Linha de Serviço
                          </Badge>
                        </div>

                        {isServiceLineSelected && serviceLineServices.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {serviceLineServices.map((service) => (
                              <div key={service.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`service-${service.id}`}
                                  checked={selectedServices.includes(service.id)}
                                  onCheckedChange={(checked) => 
                                    handleServiceChange(service.id, checked as boolean)
                                  }
                                />
                                <Label 
                                  htmlFor={`service-${service.id}`}
                                  className="text-sm text-muted-foreground"
                                >
                                  {service.name}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  Serviço
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {solution.id !== solutions[solutions.length - 1]?.id && (
                <Separator className="my-3" />
              )}
            </div>
          );
        })}

        {solutions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma solução disponível
          </p>
        )}
      </CardContent>
    </Card>
  );
}