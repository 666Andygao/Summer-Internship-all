package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.ThirdPartyCrawlLog;
import com.heritage.ecommerce.entity.ThirdPartyProductMapping;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ThirdPartyImportMapper {
    int insertCrawlLog(ThirdPartyCrawlLog log);

    List<ThirdPartyCrawlLog> queryCrawlLogsByMerchant(@Param("merchantUserId") Long merchantUserId,
                                                     @Param("status") String status,
                                                     @Param("offset") Integer offset,
                                                     @Param("size") Integer size);

    Long countCrawlLogsByMerchant(@Param("merchantUserId") Long merchantUserId,
                                 @Param("status") String status);

    int deleteCrawlLog(@Param("id") Long id, @Param("merchantUserId") Long merchantUserId);

    int insertProductMapping(ThirdPartyProductMapping mapping);

    ThirdPartyProductMapping selectMappingByLocalProduct(@Param("localProductId") Long localProductId,
                                                        @Param("sourceName") String sourceName,
                                                        @Param("sourceProductId") String sourceProductId);
}
